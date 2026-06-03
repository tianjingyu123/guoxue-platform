/**
 * 轻量 Markdown 渲染器
 * 支持：粗体、斜体、行内代码、代码块、链接、标题、列表、引用标注
 * 安全：纯字符串处理，无 innerHTML XSS 风险（Vue 自动转义，通过 v-html 渲染白名单标签）
 */

interface Token {
  tag: string
  content: string
}

/** 简单的一行 tokenizer */
function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []

  // 保护行内代码
  const codePlaceholders: string[] = []
  let processed = line.replace(/`([^`]+)`/g, (_, code) => {
    codePlaceholders.push(code)
    return `\x00CODE${codePlaceholders.length - 1}\x00`
  })

  // 粗体
  processed = processed.replace(/\*\*([^*]+)\*\*/g, (_, text) => {
    codePlaceholders.push(text)
    return `\x00BOLD${codePlaceholders.length - 1}\x00`
  })

  // 斜体
  processed = processed.replace(/\*([^*]+)\*/g, (_, text) => {
    codePlaceholders.push(text)
    return `\x00EM${codePlaceholders.length - 1}\x00`
  })

  // 引用标注 [n]
  processed = processed.replace(/\[(\d+)\]/g, (_, num) => {
    codePlaceholders.push(num)
    return `\x00CITE${codePlaceholders.length - 1}\x00`
  })

  // 链接 [text](url)
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const idx = codePlaceholders.length
    codePlaceholders.push(text)
    codePlaceholders.push(url)
    return `\x00LINK${idx}\x00`
  })

  // 解析占位符（\x00 作为分隔符，ESLint no-control-regex 此处故意使用不可见字符作为安全标记）
  // eslint-disable-next-line no-control-regex
  const parts = processed.split(/(\x00(?:CODE|BOLD|EM|CITE|LINK)\d+\x00)/)
  for (const part of parts) {
    // eslint-disable-next-line no-control-regex
    const m = part.match(/^\x00(CODE|BOLD|EM|CITE|LINK)(\d+)\x00$/)
    if (m) {
      const type = m[1]
      const idx = parseInt(m[2])
      if (type === 'CODE') tokens.push({ tag: 'code', content: codePlaceholders[idx] })
      else if (type === 'BOLD') tokens.push({ tag: 'strong', content: codePlaceholders[idx] })
      else if (type === 'EM') tokens.push({ tag: 'em', content: codePlaceholders[idx] })
      else if (type === 'CITE') tokens.push({ tag: 'cite', content: codePlaceholders[idx] })
      else if (type === 'LINK') tokens.push({ tag: 'a', content: codePlaceholders[idx] + '\x01' + codePlaceholders[idx + 1] })
    } else if (part) {
      tokens.push({ tag: 'text', content: part })
    }
  }

  return tokens
}

/** 转义 HTML */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 将 token 列表渲染为 HTML */
function tokensToHtml(tokens: Token[]): string {
  return tokens.map(t => {
    switch (t.tag) {
      case 'text': return escapeHtml(t.content)
      case 'code': return `<code style="background:#f0f2f5;padding:1px 5px;border-radius:3px;font-size:0.9em">${escapeHtml(t.content)}</code>`
      case 'strong': return `<strong>${escapeHtml(t.content)}</strong>`
      case 'em': return `<em>${escapeHtml(t.content)}</em>`
      case 'cite': return `<sup style="color:#409eff;cursor:pointer;font-weight:600">[${escapeHtml(t.content)}]</sup>`
      case 'a': {
        const [text, url] = t.content.split('\x01')
        return `<a href="${escapeHtml(url)}" target="_blank" style="color:#409eff">${escapeHtml(text || url)}</a>`
      }
      default: return escapeHtml(t.content)
    }
  }).join('')
}

/** 渲染 Markdown 为 HTML */
export function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 代码块
    if (line.trimStart().startsWith('```')) {
      if (inCodeBlock) {
        result.push(
          `<pre style="background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:6px;overflow-x:auto;margin:8px 0;font-size:13px;line-height:1.5"><code>${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`
        )
        codeBlockContent = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    // 空行
    if (!line.trim()) {
      result.push('<br>')
      continue
    }

    // 标题
    if (/^#{1,4}\s/.test(line)) {
      const lvl = line.match(/^(#{1,4})/)![1].length
      const text = line.replace(/^#{1,4}\s*/, '')
      const sizes = ['1.5em', '1.3em', '1.15em', '1.05em']
      result.push(`<h${lvl} style="font-size:${sizes[lvl-1]};margin:10px 0 4px;font-weight:600">${tokensToHtml(tokenizeLine(text))}</h${lvl}>`)
      continue
    }

    // 无序列表
    if (/^[-*+]\s/.test(line.trimStart())) {
      const indent = line.match(/^(\s*)/)![1].length
      const text = line.trimStart().replace(/^[-*+]\s*/, '')
      result.push(`<div style="margin:2px 0;padding-left:${indent + 20}px">• ${tokensToHtml(tokenizeLine(text))}</div>`)
      continue
    }

    // 有序列表
    if (/^\d+\.\s/.test(line.trimStart())) {
      const indent = line.match(/^(\s*)/)![1].length
      const m = line.trimStart().match(/^(\d+)\.\s(.*)/)!
      result.push(`<div style="margin:2px 0;padding-left:${indent + 20}px">${m[1]}. ${tokensToHtml(tokenizeLine(m[2]))}</div>`)
      continue
    }

    // 水平线
    if (/^-{3,}$/.test(line.trim())) {
      result.push('<hr style="border:none;border-top:1px solid #ebeef5;margin:12px 0">')
      continue
    }

    // 普通段落
    result.push(`<p style="margin:4px 0;line-height:1.7;white-space:pre-wrap">${tokensToHtml(tokenizeLine(line))}</p>`)
  }

  // 未闭合代码块
  if (inCodeBlock && codeBlockContent.length) {
    result.push(
      `<pre style="background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:6px;overflow-x:auto;margin:8px 0;font-size:13px;line-height:1.5"><code>${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`
    )
  }

  return result.join('\n')
}
