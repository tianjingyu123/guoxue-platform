import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'

const html = fs.readFileSync('apps/mobile/public/pkg-common/legacy-paipan-share/index/index.html', 'utf8')
const script = html.match(/<script>([\s\S]*?)<\/script>/u)?.[1]
assert.ok(script)

function load(target, browser = {}) {
  const ids = ['title', 'detail', 'continue', 'result-frame', 'result-share', 'result-message', 'share-mask', 'share-hint', 'share-close', 'share-friend', 'share-timeline', 'share-poster', 'share-copy', 'poster-mask', 'poster-close', 'poster-image', 'poster-save']
  const nodes = Object.fromEntries(ids.map(id => {
    const classes = new Set()
    return [id, { textContent: '', href: '', src: '', style: {}, classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) } }]
  }))
  const redirects = []
  const body = { className: '' }
  const location = {
    search: target == null ? '' : `?target=${encodeURIComponent(target)}`,
    href: 'https://gx.yrydai.com/h5/pkg-common/legacy-paipan-share/index/?target=fixture',
    replace: url => redirects.push(url),
  }
  vm.runInNewContext(script, { URL, URLSearchParams, Set, location, document: { body, getElementById: id => nodes[id] }, navigator: browser })
  return { nodes, redirects, body }
}

test('非已验证结果地址保留数字推荐来源，使用顶层跳转', () => {
  for (const url of [
    'https://www.yrydai.com/p1.php?mod=bazi&ruid=5',
    'https://www.yrydai.cn/app_p1.php?mod=bazi&act=view&id=fixture-1&ruid=123',
  ]) {
    const actual = load(url)
    assert.deepEqual(actual.redirects, [url.replace('/app_p1.php', '/p1.php')])
    assert.equal(actual.nodes.continue.style.display, 'inline-block')
  }
  assert.doesNotMatch(html, /<web-view|innerHTML|localStorage/u)
})

test('已验证格式的八字结果在热卜外壳内显示，分享目标仍是热卜页', async () => {
  const target = 'https://www.yrydai.com/p1.php?mod=bazi&act=baziPan&id=123456&ruid=5'
  const shared = []
  const actual = load(target, { share: async payload => shared.push(payload) })
  assert.deepEqual(actual.redirects, [])
  assert.equal(actual.body.className, 'result')
  assert.equal(actual.nodes['result-frame'].src, target)
  await actual.nodes['result-share'].onclick()
  assert.equal(actual.nodes['share-mask'].classList.contains('open'), true)
  await actual.nodes['share-friend'].onclick()
  assert.equal(shared.length, 1)
  assert.equal(shared[0].url, 'https://gx.yrydai.com/h5/pkg-common/legacy-paipan-share/index/?target=fixture')
  assert.match(html, /href="\/h5\/"/u)
  assert.match(html, /navigator\.share\(\{ title: '热卜八字排盘', url: location\.href \}\)/u)
  assert.match(html, /生成海报/u)
})

test('无目标或敏感、伪造、非数字来源不得跳转', () => {
  for (const url of [
    null,
    'http://www.yrydai.com/p1.php?mod=bazi',
    'https://www.yrydai.com.evil.example/p1.php?mod=bazi',
    'https://www.yrydai.com/p1.php?mod=bazi&ruid=abc',
    'https://www.yrydai.com/p1.php?mod=bazi&ruid=5&ruid=6',
    'https://www.yrydai.com/p1.php?token=SECRET',
    'https://www.yrydai.com/login.php?mod=bazi',
    'https://www.yrydai.com/a/../p1.php?mod=bazi',
    'https://www.yrydai.com/p1.php?mod=bazi#fragment',
  ]) {
    const actual = load(url)
    assert.deepEqual(actual.redirects, [], String(url))
    assert.equal(actual.nodes.title.textContent, '分享链接无效')
  }
})
