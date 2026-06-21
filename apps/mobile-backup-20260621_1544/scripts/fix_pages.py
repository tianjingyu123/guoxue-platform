#!/usr/bin/env python3
"""批量修复 live 和 course 页面：将直接 mock 导入改为 API 调用"""
import sys, re, os

def fix_live_plaza(content):
    """修复 pkg-live/plaza/index.vue"""
    # 替换导入
    content = content.replace(
        "import { liveTabs, liveList, type LiveItem } from '@/lib/live-data'",
        "import { liveApi, liveTabs, type LiveItem } from '@/lib/live-data'"
    )
    # 在 import 后添加 ref/onMounted（如果还没有）
    if 'from \'vue\'' in content and 'onMounted' not in content.split('from \'vue\'')[0].split('\n')[-1]:
        content = content.replace(
            "import { ref, computed } from 'vue'",
            "import { ref, computed, onMounted } from 'vue'"
        )
    # 替换 liveList 为响应式数据 + 添加 loadData
    old_block = """const activeTab = ref<string>('全部')

const filtered = computed<LiveItem[]>(() => {
  return liveList.filter((live) => {"""
    new_block = """const activeTab = ref<string>('全部')
const liveList = ref<LiveItem[]>([])
const loading = ref(false)
const error = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.list()
    liveList.value = res.items
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally { loading.value = false }
}
onMounted(() => { loadData() })

const filtered = computed<LiveItem[]>(() => {
  return liveList.value.filter((live) => {"""
    content = content.replace(old_block, new_block)
    return content

def fix_live_hosts(content):
    """修复 pkg-live/hosts/index.vue"""
    content = content.replace(
        "import { liveHosts, type LiveHost } from '@/lib/live-data'",
        "import { liveApi, type LiveHost } from '@/lib/live-data'"
    )
    if 'onMounted' not in content:
        content = content.replace(
            "import { ref, computed } from 'vue'",
            "import { ref, computed, onMounted } from 'vue'"
        )
    old = """const search = ref('')
const filter = ref<FilterKey>('all')

const filtered = computed<LiveHost[]>(() =>
  liveHosts.filter((h) => {"""
    new = """const search = ref('')
const filter = ref<FilterKey>('all')
const liveHosts = ref<LiveHost[]>([])
const loading = ref(false)
const error = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    liveHosts.value = await liveApi.hosts()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally { loading.value = false }
}
onMounted(() => { loadData() })

const filtered = computed<LiveHost[]>(() =>
  liveHosts.value.filter((h) => {"""
    content = content.replace(old, new)
    return content

def fix_live_replays(content):
    """修复 pkg-live/replays/index.vue"""
    content = content.replace(
        "import { liveReplays, replaySortOptions, formatLiveDuration, formatLiveViews } from '@/lib/live-data'",
        "import { liveApi, replaySortOptions, formatLiveDuration, formatLiveViews } from '@/lib/live-data'"
    )
    if 'onMounted' not in content:
        if 'import {' in content and 'from \'vue\'' in content:
            content = content.replace(
                "import { ref, computed } from 'vue'",
                "import { ref, computed, onMounted } from 'vue'"
            )
    # Add reactive data and loadData
    old_script = "import { liveApi, replaySortOptions"
    # Find the script block and inject
    return content

def fix_live_vertical(content):
    """修复 pkg-live/vertical/index.vue"""
    # Replace multiple imports from live-data
    content = content.replace(
        "} from '@/lib/live-data'",
        "} from '@/lib/live-data'\nimport { liveApi } from '@/lib/live-data'"
    )
    return content

def fix_live_horizontal(content):
    """修复 pkg-live/horizontal/index.vue"""
    content = content.replace(
        "} from '@/lib/live-data'",
        "} from '@/lib/live-data'\nimport { liveApi } from '@/lib/live-data'"
    )
    return content

def fix_course_home(content):
    """修复 pkg-course/home/index.vue"""
    old_imports = """import {
  courseBanners, categoryNav, allCourses,
  featured, ranking, flashSaleCourses, freeCourses, newCourses, feedFilters,
} from '@/lib/course-data'"""
    new_imports = """import { courseApi, type Course, type CourseCategory } from '@/lib/course-data'
import { courseBanners } from '@/lib/course-data'"""
    content = content.replace(old_imports, new_imports)

    # Replace the loadData function's setTimeout with real API call
    old_load = """async function loadData() {
  loading.value = true
  error.value = ''
  try {
    await new Promise(r => setTimeout(r, 300))
    dataReady.value = true
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}"""
    new_load = """const categoryNav = ref<CourseCategory[]>([])
const allCourses = ref<Course[]>([])
const featured = ref<Course[]>([])
const ranking = ref<Course[]>([])
const flashSaleCourses = ref<Course[]>([])
const freeCourses = ref<Course[]>([])
const newCourses = ref<Course[]>([])
const feedFilters = ref<{ id: string; label: string }[]>([])

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [cats, list] = await Promise.all([courseApi.categories(), courseApi.list()])
    categoryNav.value = cats
    allCourses.value = list.courses
    featured.value = list.courses.filter(c => c.tag === '热销').slice(0, 6)
    ranking.value = [...list.courses].sort((a, b) => (b.students ?? 0) - (a.students ?? 0)).slice(0, 5)
    flashSaleCourses.value = list.courses.filter(c => c.flashSale)
    freeCourses.value = list.courses.filter(c => c.free)
    newCourses.value = list.courses.filter(c => c.isNew)
    feedFilters.value = [
      { id: 'all', label: '全部' }, { id: 'bazi', label: '八字命理' },
      { id: 'ziwei', label: '紫微斗数' }, { id: 'fengshui', label: '风水堪舆' },
      { id: 'qimen', label: '奇门遁甲' }, { id: 'mianxiang', label: '面相手相' },
    ]
    dataReady.value = true
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}"""
    content = content.replace(old_load, new_load)
    return content

def fix_course_detail(content):
    """修复 pkg-course/detail/index.vue"""
    old_import = """// @data-needs: 课程详情聚合, 参数 courseId, 返回 { detail:CourseDetail, chapters:CourseChapter[], reviews:CourseReview[], hasAccess:boolean }
// mock 见 @/lib/course-data.ts，交付时由 Claude Code 替换为真实接口
import { courseDetail as course, courseChapters as chapters, courseReviews as reviews } from '@/lib/course-data'"""
    new_import = """import { courseApi, type CourseDetail, type CourseChapter, type CourseReview } from '@/lib/course-data'"""
    content = content.replace(old_import, new_import)

    # Replace static imports with reactive refs
    old_reactive = """// 纯 UI 状态
const activeTab = ref<'intro' | 'chapters' | 'reviews'>('intro')
const expanded = ref<Record<string, boolean>>({ c1: true })
const isLiked = ref(false)
const showGroupBuyBanner = ref(true)
const showConsultPanel = ref(false)
const showGroupPanel = ref(false)
const hasAccess = ref(false)

const totalLessons = computed(() => chapters.reduce((s, c) => s + c.lessons.length, 0))
const totalDuration = computed(() => chapters.reduce((s, c) => s + c.duration, 0))

const tabs = computed(() => [
  { key: 'intro', label: '简介' },
  { key: 'chapters', label: `目录(${totalLessons.value})` },
  { key: 'reviews', label: `评价(${reviews.length})` },
])"""
    new_reactive = """// 纯 UI 状态
const activeTab = ref<'intro' | 'chapters' | 'reviews'>('intro')
const expanded = ref<Record<string, boolean>>({ c1: true })
const isLiked = ref(false)
const showGroupBuyBanner = ref(true)
const showConsultPanel = ref(false)
const showGroupPanel = ref(false)
const hasAccess = ref(false)

const course = ref<CourseDetail | null>(null)
const chapters = ref<CourseChapter[]>([])
const reviews = ref<CourseReview[]>([])

const totalLessons = computed(() => chapters.value.reduce((s, c) => s + c.lessons.length, 0))
const totalDuration = computed(() => chapters.value.reduce((s, c) => s + c.duration, 0))

const tabs = computed(() => [
  { key: 'intro', label: '简介' },
  { key: 'chapters', label: `目录(${totalLessons.value})` },
  { key: 'reviews', label: `评价(${reviews.value.length})` },
])"""
    content = content.replace(old_reactive, new_reactive)

    # Replace loadData
    old_load = """async function loadData() {
  loading.value = true
  error.value = ''
  try {
    await new Promise(r => setTimeout(r, 300))
    dataReady.value = true
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}"""
    new_load = """async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const id = '1' // TODO: 从路由参数获取 courseId
    const [detail, chs, revs] = await Promise.all([
      courseApi.detail(id), courseApi.chapters(id), courseApi.reviews(id),
    ])
    course.value = detail
    chapters.value = chs
    reviews.value = revs
    dataReady.value = true
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}"""
    content = content.replace(old_load, new_load)
    return content

# Main dispatcher
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python fix_pages.py <file_path>")
        sys.exit(1)

    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        sys.exit(1)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    if 'pkg-live/plaza' in filepath:
        content = fix_live_plaza(content)
        print("Applied: fix_live_plaza")
    elif 'pkg-live/hosts' in filepath:
        content = fix_live_hosts(content)
        print("Applied: fix_live_hosts")
    elif 'pkg-course/home' in filepath:
        content = fix_course_home(content)
        print("Applied: fix_course_home")
    elif 'pkg-course/detail' in filepath:
        content = fix_course_detail(content)
        print("Applied: fix_course_detail")
    else:
        print(f"No fixer for: {filepath}")
        sys.exit(0)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Fixed: {filepath}")
    else:
        print(f"⏭️  No changes: {filepath}")
