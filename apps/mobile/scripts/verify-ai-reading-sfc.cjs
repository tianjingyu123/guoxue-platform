const fs = require('node:fs')
const path = require('node:path')
const { parse, compileScript, compileTemplate } = require('vue/compiler-sfc')

for (const relative of [
  'src/components/common/ai-readable-answer.vue',
  'src/components/common/ai-search-modal.vue',
  'src/pkg-classics/ai-assistant/index.vue',
  'src/pkg-classics/companion/index.vue',
  'src/pkg-classics/reader/index.vue',
  'src/pkg-classics/audiobooks/player.vue',
]) {
  const filename = path.resolve(__dirname, '..', relative)
  const source = fs.readFileSync(filename, 'utf8')
  const parsed = parse(source, { filename })
  if (parsed.errors.length) throw new Error(`${relative}: ${parsed.errors.join('; ')}`)
  compileScript(parsed.descriptor, { id: relative })
  const template = compileTemplate({ source: parsed.descriptor.template.content, filename, id: relative })
  if (template.errors.length) throw new Error(`${relative}: ${template.errors.join('; ')}`)
}

process.stdout.write('AI 页面 SFC 脚本与模板编译检查：通过\n')
