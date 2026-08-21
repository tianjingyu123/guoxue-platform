import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const source = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8')

test('TEXT/EBOOK 课程正文不再被适配为视频地址', () => {
  const adapter = source('apps/mobile/src/lib/course-data.ts')

  assert.match(adapter, /courseType === 'TEXT' \|\| courseType === 'EBOOK'/)
  assert.match(adapter, /const videoUrl = isTextCourse \? '' : String\(ch\.mediaUrl \|\| rawContent\)/)
  assert.match(adapter, /const articleContent = isTextCourse \? normalizeCourseContent\(rawContent\) : ''/)
  assert.match(adapter, /courseType,/)
  assert.match(adapter, /content: articleContent,/)
  assert.match(adapter, /progressPercent,/)
  assert.doesNotMatch(adapter, /videoUrl:\s*ch\.mediaUrl \|\| ch\.content/)
})

test('课程正文进入 rich-text 前完成危险节点和协议清洗', () => {
  const rich = source('apps/mobile/src/utils/rich-content.ts')

  assert.match(rich, /export function sanitizeCourseRichContent/)
  assert.match(rich, /script\|style\|iframe\|object\|embed/)
  assert.match(rich, /on\[a-z0-9_-\]/)
  assert.match(rich, /javascript\|vbscript\|data/)
  assert.match(rich, /export function normalizeCourseContent/)
  assert.match(rich, /return normalizeArticleContent\(s\)/)
})

test('跨端播放器为文字课提供正文、目录切章、进度和前后台恢复', () => {
  const player = source('apps/mobile/src/pkg-course/player/index.vue')

  assert.match(player, /type === 'TEXT' \|\| type === 'EBOOK'/)
  assert.match(player, /<rich-text v-if="content\.content" class="a-body" :nodes="content\.content"/)
  assert.match(player, /@tap="onDrawerLessonTap\(chapter, lesson\)"/)
  assert.match(player, /await courseApi\.saveProgress\(currentLessonId\.value, 100, true\)/)
  assert.match(player, /markArticleCompleted\(currentLessonId\.value\)/)
  assert.match(player, /if \(content\.value\?\.nextLesson\) await switchLesson/)
  assert.match(player, /onHide\(\(\) => \{[\s\S]*ensureArticleReadingProgress\(\)/)
  assert.match(player, /onShow\(\(\) => \{[\s\S]*ensureArticleReadingProgress\(\)/)
  assert.match(player, /paddingBottom: \(safeBottom \+ 40\) \+ 'px'/)
  assert.match(player, /class="page article-page"/)
  assert.match(player, /\.article-page \{ height: 100vh; min-height: 0; display: flex; flex-direction: column; overflow: hidden; \}/)
  assert.match(player, /\.a-scroll \{ flex: 1; height: 0; \}/)

  const saveIndex = player.indexOf('await courseApi.saveProgress(currentLessonId.value, 100, true)')
  const switchIndex = player.indexOf('await switchLesson(content.value.nextLesson.id)', saveIndex)
  assert.ok(saveIndex >= 0 && switchIndex > saveIndex, '文字课必须先保存完成进度，再切换下一讲')
})

test('文字课静态门禁已接入正式客户端构建门禁', () => {
  const pkg = JSON.parse(source('package.json'))
  assert.match(pkg.scripts['release:test-mobile-native-bundle'], /mobile-course-text-player\.test\.mjs/)
  assert.match(pkg.scripts['release:gate:code'], /release:test-mobile-native-bundle/)
})
