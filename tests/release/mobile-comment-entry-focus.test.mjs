import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const article = fs.readFileSync('apps/mobile/src/pkg-circle/articles/detail.vue', 'utf8')
const post = fs.readFileSync('apps/mobile/src/pkg-circle/circles/post.vue', 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))

test('文章评论入口定位评论区后必须聚焦真输入框', () => {
  assert.match(article, /const commentSectionRef = ref</u)
  assert.match(article, /<comment-section\s+ref="commentSectionRef"/u)
  assert.match(article, /async function focusComment\(\)[\s\S]*commentSectionRef\.value\?\.focusInput\(\)/u)
})

test('圈子帖子评论入口定位评论区后必须聚焦真输入框', () => {
  assert.match(post, /const commentSectionRef = ref</u)
  assert.match(post, /<comment-section\s+ref="commentSectionRef"/u)
  assert.match(post, /async function scrollToComments\(\)[\s\S]*commentSectionRef\.value\?\.focusInput\(\)/u)
})

test('评论入口回归接入移动端发布门禁', () => {
  assert.match(pkg.scripts['release:test-mobile-native-bundle'], /mobile-comment-entry-focus\.test\.mjs/u)
})
