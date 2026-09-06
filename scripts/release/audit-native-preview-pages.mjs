import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** 必要条件扫描，不代替生命周期、撤权及真机验收。缺项即阻断发布。 */
export function auditNativePreviewPages(root, read = file => fs.readFileSync(file, 'utf8')) {
  const src = path.join(root, 'apps/mobile/src')
  const config = JSON.parse(read(path.join(src, 'pages.json')).replace(/^\s*\/\/.*$/gm, ''))
  const pages = config.subPackages.filter(p => /^pkg-paipan(?:2|3)?$/.test(p.root))
    .flatMap(p => p.pages.map(page => `${p.root}/${page.path}`))
  if (!pages.length || new Set(pages).size !== pages.length) throw new Error('排盘路由清单为空或重复')
  const results = pages.map(route => {
    const source = read(path.join(src, `${route}.vue`))
    const script = source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? ''
    const template = source.slice(source.indexOf('<template'))
    // 兼容罗盘地址仅可承接共用罗盘，不属于整套自研工具；不能把同包所有页面豁免。
    const sharedCompassRedirect = route === 'pkg-paipan3/luopan/index'
      && /uni\.redirectTo\(\s*\{\s*url:\s*['"]\/pkg-common\/compass\/index['"]/.test(script)
      && /onLoad\(openCompass\)/.test(script)
      && !/useNativePreviewPage|nativeQaAccess|getStorageSync|request\s*\(/.test(script)
    const imported = /import\s*\{\s*useNativePreviewPage\s*\}\s*from\s*['"]@\/composables\/useNativePreviewPage['"]/.test(script)
    const binding = script.match(/const\s+(\w+)\s*=\s*useNativePreviewPage\s*\(/)?.[1]
    const destructured = !!binding && new RegExp(`const\\s*\\{\\s*allowed\\s*,[^}]*\\}\\s*=\\s*${binding}\\b`).test(script)
    const hiddenUntilAllowed = !!binding && (template.includes(`${binding}.allowed.value`)
      || (destructured && template.includes('v-if="!allowed"') && /\bv-else\b/.test(template)))
    return { route, imported, bound: !!binding, hiddenUntilAllowed,
      localHistory: /load\w*History|createHistory|getStorageSync/.test(script),
      lifecycle: [...script.matchAll(/\b(onLoad|onShow|onMounted)\s*\(/g)].map(m => m[1]),
      sharedCompassRedirect,
      pass: sharedCompassRedirect || (imported && !!binding && hiddenUntilAllowed) }
  })
  return { total: pages.length, wired: results.filter(p => p.pass).length,
    missing: results.filter(p => !p.pass), pages: results }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = auditNativePreviewPages(process.cwd())
  console.log(JSON.stringify(report, null, 2))
  if (report.missing.length) process.exitCode = 1
}
