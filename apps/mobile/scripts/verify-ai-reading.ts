import assert from 'node:assert/strict'
import { presentAiAnswer } from '../src/lib/ai-readable-answer'
import { canOpenAiGuideTarget, selectReadingGuideCards, shouldShowLearningGuide } from '../src/lib/ai-reading-guide'

assert.deepEqual(presentAiAnswer('你好'), { lead: '你好', detail: '' })
assert.deepEqual(presentAiAnswer('**仁**，是体察并善待他人。'), { lead: '仁，是体察并善待他人。', detail: '' })

const longAnswer = `“学而时习之”说的是学到的东西要反复练习。${'在生活里试着用一次，你会更容易记住它。'.repeat(7)}`
const presented = presentAiAnswer(longAnswer)
assert.equal(presented.lead, '“学而时习之”说的是学到的东西要反复练习。')
assert.equal(presented.lead + presented.detail, longAnswer)
assert.equal(presentAiAnswer('没有标点的长文'.repeat(24)).detail, '')

assert.equal(shouldShowLearningGuide('《论语》中的仁是什么意思'), true)
assert.equal(shouldShowLearningGuide('你好'), false)
assert.equal(shouldShowLearningGuide('课程退款失败怎么办'), false)
assert.equal(canOpenAiGuideTarget('/pkg-classics/detail/index?id=book-1'), true)
assert.equal(canOpenAiGuideTarget('https://example.com/lesson'), false)
assert.equal(canOpenAiGuideTarget('/pkg-course/detail/index?id=x&redirect=https://example.com'), false)
const guideCards = [
  { type: 'course', target: '/pkg-course/detail/index?id=c1' },
  { type: 'classic', target: '/pkg-classics/detail/index?id=b1' },
  { type: 'article', target: '/pkg-circle/articles/detail?id=a1' },
]
assert.deepEqual(selectReadingGuideCards(guideCards, '论语中的仁是什么意思').map((item) => item.type), ['classic', 'article'])
assert.deepEqual(selectReadingGuideCards(guideCards, '找一门课程').map((item) => item.type), ['course', 'classic'])

process.stdout.write('AI 阅读分层与导览安全检查：通过\n')
