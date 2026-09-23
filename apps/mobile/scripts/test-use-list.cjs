/* 分类和排序快速切换时，旧请求不能覆盖新结果。 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

const sourcePath = path.resolve(__dirname, '../src/composables/useList.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const testModule = new Module(sourcePath, module)
testModule.filename = sourcePath
testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath))
testModule._compile(compiled, sourcePath)
const { useList } = testModule.exports

function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

async function main() {
  const first = deferred()
  let calls = 0
  const listing = useList({
    fetcher: () => ++calls === 1 ? first.promise : Promise.resolve({ items: ['新分类'] }),
  })
  const oldRequest = listing.refresh()
  await listing.refresh()
  first.resolve({ items: ['旧分类'] })
  await oldRequest
  assert.deepEqual(listing.list.value, ['新分类'])
  assert.equal(listing.loading.value, false)

  const nextPage = deferred()
  let currentCategory = '甲'
  const paging = useList({
    pageSize: 1,
    fetcher: ({ page }) => page === 2
      ? nextPage.promise
      : Promise.resolve({ items: [currentCategory] }),
  })
  await paging.refresh()
  const oldPage = paging.loadMore()
  currentCategory = '乙'
  await paging.refresh()
  nextPage.resolve({ items: ['甲的下一页'] })
  await oldPage
  assert.deepEqual(paging.list.value, ['乙'])
  console.log('useList 竞态验证通过：刷新保留最新分类，旧分页不会混入新分类')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
