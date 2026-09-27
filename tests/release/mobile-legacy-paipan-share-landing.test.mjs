import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'

const html = fs.readFileSync('apps/mobile/public/pkg-common/legacy-paipan-share/index/index.html', 'utf8')
const script = html.match(/<script>([\s\S]*?)<\/script>/u)?.[1]
assert.ok(script)

function load(target) {
  const nodes = Object.fromEntries(['title', 'detail', 'continue'].map(id => [id, { textContent: '', href: '', style: {} }]))
  const redirects = []
  const location = {
    search: target == null ? '' : `?target=${encodeURIComponent(target)}`,
    replace: url => redirects.push(url),
  }
  vm.runInNewContext(script, { URLSearchParams, Set, location, document: { getElementById: id => nodes[id] } })
  return { nodes, redirects }
}

test('公开工具入口和盘面保留数字推荐来源，使用顶层跳转', () => {
  for (const url of [
    'https://www.yrydai.com/p1.php?mod=bazi&ruid=5',
    'https://www.yrydai.cn/app_p1.php?mod=bazi&act=view&id=fixture-1&ruid=123',
  ]) {
    const actual = load(url)
    assert.deepEqual(actual.redirects, [url.replace('/app_p1.php', '/p1.php')])
    assert.equal(actual.nodes.continue.style.display, 'inline-block')
  }
  assert.doesNotMatch(html, /<iframe|<web-view|innerHTML|localStorage/u)
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
