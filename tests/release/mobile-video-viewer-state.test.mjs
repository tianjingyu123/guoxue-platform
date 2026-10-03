import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { videoRuntime, sampleVideo } from './helpers/mobile-video-fixture.mjs'

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const settle = () => new Promise((resolve) => setImmediate(resolve))

test('重复点按锁住单请求，计数只使用真实返回；失败不变图标/计数', async () => {
  const pending = deferred(); let calls = 0
  const r = videoRuntime({ like: async () => { calls++; return pending.promise } })
  const first = r.onLike(); const repeated = r.onLike()
  await settle()
  assert.equal(calls, 1)
  assert.equal(r.currentVideo.value.likes, 7)
  pending.resolve({ isLiked: true, likeCount: 19 })
  await Promise.all([first, repeated])
  assert.equal(r.currentVideo.value.likes, 19)
  assert.equal(r.currentVideo.value.isLiked, true)
  const failed = videoRuntime({ collect: async () => { throw Error('网络失败') } })
  await failed.onCollect()
  assert.equal(failed.currentVideo.value.isCollected, false)
  assert.equal(failed.currentVideo.value.collectCount, 2)
  assert.equal(failed.toasts.length, 1)
})

test('未知状态先查询，不把缺字段当未赞；同时点赞收藏共用一次补全', async () => {
  let reads = 0, likes = 0, collects = 0
  const pending = deferred()
  const r = videoRuntime({ getById: async () => { reads++; return pending.promise },
    like: async () => { likes++; return { isLiked: true, likeCount: 8 } },
    collect: async () => { collects++; return { isCollected: true, collectCount: 3 } } })
  r.currentVideo.value.isLiked = undefined
  r.currentVideo.value.isCollected = undefined
  const jobs = [r.onLike(), r.onCollect()]
  await settle(); assert.equal(reads, 1)
  pending.resolve(sampleVideo())
  await Promise.all(jobs)
  assert.equal(likes, 1); assert.equal(collects, 1)
  assert.equal(r.currentVideo.value.isLiked, true)
  assert.equal(r.currentVideo.value.isCollected, true)
  for (const detail of [null, { ...sampleVideo(), id: 'wrong' }, { ...sampleVideo(), isLiked: undefined }]) {
    const invalid = videoRuntime({ getById: async () => detail, like: async () => { throw Error('不能发起') } })
    invalid.currentVideo.value.isLiked = undefined
    await invalid.onLike(true)
    assert.equal(invalid.currentVideo.value.isLiked, undefined)
    assert.match(invalid.toasts[0].title, /互动状态暂不可用/)
  }
})

test('双击已赞不切换；关注成功同步同作者，失败保持旧态', async () => {
  let likes = 0, follows = 0
  const r = videoRuntime({ like: async () => { likes++ }, followAuthor: async () => { follows++ } })
  r.currentVideo.value.isLiked = true
  await r.onLike(true)
  assert.equal(likes, 0)
  await r.onFollow()
  assert.equal(follows, 1)
  assert.equal(r.videos.value[1].author.isFollowed, true)
  const failed = videoRuntime({ followAuthor: async () => { throw Error('关注失败') } })
  await failed.onFollow()
  assert.equal(failed.currentVideo.value.author.isFollowed, false)
})

test('迟到详情不能覆盖已确认操作或正在进行的操作', async () => {
  for (const finishLikeFirst of [true, false]) {
    const detail = deferred(), like = deferred()
    const r = videoRuntime({ getById: async () => detail.promise, like: async () => like.promise })
    const detailWatch = r.watches.find((w) => String(w.callback).includes('const revision'))
    const liked = r.onLike()
    const loaded = detailWatch.callback('test-video')
    if (finishLikeFirst) { like.resolve({ isLiked: true, likeCount: 11 }); await liked }
    detail.resolve({ ...sampleVideo(), title: '完整详情', isLiked: false, likes: 2 })
    await loaded
    if (!finishLikeFirst) { like.resolve({ isLiked: true, likeCount: 11 }); await liked }
    assert.equal(r.currentVideo.value.isLiked, true)
    assert.equal(r.currentVideo.value.likes, 11)
    assert.equal(r.currentVideo.value.title, '完整详情')
  }
})

test('真实适配器保留列表/精简项互动状态，缺失保持未知，异常toggle不编造成功', async () => {
  let response = {}
  const context = vm.createContext({ URLSearchParams, apiPost: async () => response })
  const source = fs.readFileSync('apps/mobile/src/lib/video-data.ts', 'utf8').replace(/^import[^\r\n]*$/gm, '').replace(/\bexport\s+/g, '')
  vm.runInContext(stripTypeScriptTypes(source), context)
  const { adaptVideoItem, adaptVideoListItem, videoApi } = vm.runInContext('({adaptVideoItem,adaptVideoListItem,videoApi})', context)
  assert.equal(adaptVideoItem({ id: 'V' }).isLiked, undefined)
  assert.equal(adaptVideoItem({ id: 'V', isLiked: true, isCollected: true, isFollowed: true }).author.isFollowed, true)
  const compact = adaptVideoListItem({ id: 'V', isLiked: true, isCollected: true, author: { id: 'U', isFollowed: true } })
  assert.equal(compact.isLiked, true); assert.equal(compact.isCollected, true)
  assert.equal(compact.author.id, 'U'); assert.equal(compact.author.isFollowed, true)
  await assert.rejects(videoApi.like('V'), /点赞状态暂不可用/)
  await assert.rejects(videoApi.collect('V'), /收藏状态暂不可用/)
  response = { liked: false, likeCount: 23 }
  assert.equal((await videoApi.like('V')).likeCount, 23)
  response = { collected: true, collectCount: -1 }
  const collected = await videoApi.collect('V')
  assert.equal(collected.isCollected, true); assert.equal(collected.collectCount, undefined)
})
