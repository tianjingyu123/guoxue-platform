/**
 * 富文本详情归一化（全端共用）—— 商品详情 / 课程章节 / 圈子文章等 rich-text 渲染前统一预处理。
 *
 * 解决三类真机问题（董事长反馈「详情图之间有缝隙，无法多图拼接展示整体效果」）：
 * ① 存量脏数据：整段 HTML 曾被后端 SanitizePipe 转义（&lt;p&gt;…）→ rich-text 渲染成源码，先反转义；
 * ② img 基线缝：富文本里 <img> 默认 display:inline，行盒基线下留几 px 白缝 →
 *    行内注入 display:block + vertical-align:top（rich-text 内部节点不吃页面 scoped CSS，只能行内注入）；
 * ③ 段落缝：wangEditor 每张图包一个 <p>，<p> 默认 margin 也是缝 →
 *    仅对「纯图片段落」注入 margin:0 + line-height:0，文字段落间距不受影响。
 */

/** 反转义后端 SanitizePipe 产出的 HTML 实体（存量脏数据：URL 被转成 https:&#x2F;&#x2F;、富文本被转成 &lt;p&gt;） */
export function unescapeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&')
}

/** 注入到每个 <img> 的行内样式（放在原 style 之后，同名属性后者胜 → 保证无缝声明生效） */
const IMG_SEAMLESS_STYLE =
  'display:block;width:100%;height:auto;margin:0;padding:0;border:0;vertical-align:top;'

/** 注入到「纯图片段落 <p>」的行内样式（去段落缝；line-height/font-size 归零消灭行盒残留高度） */
const IMG_P_STYLE = 'margin:0;padding:0;line-height:0;font-size:0;'

/** 把样式合并进标签属性串：已有 style 则追加在其后（后声明覆盖），否则新增 style 属性 */
function mergeStyle(attrs: string, inject: string): string {
  let a = String(attrs)
  if (/style\s*=/i.test(a)) {
    a = a.replace(/style\s*=\s*(["'])(.*?)\1/i, (_m, q: string, val: string) => {
      const sep = val && !/;\s*$/.test(val) ? ';' : ''
      return `style=${q}${val}${sep}${inject}${q}`
    })
  } else {
    a = `${a} style="${inject}"`
  }
  return a
}

/**
 * 富文本内容归一化：反转义 + 图片无缝通栏。
 * - <img>：去固定 width/height 属性，行内注入 display:block;width:100%（多图上下无缝拼接）；
 * - 仅包图片的 <p>：注入 margin:0;line-height:0（wangEditor 图片段落默认 margin 是另一层缝）；
 * - 文字段落不动，保持原有阅读间距。
 */
export function normalizeRichContent(html?: string): string {
  let s = String(html ?? '')
  if (!s) return ''
  // ① 存量转义脏数据：看不到真实标签但有 &lt; 实体 → 先反转义
  if (!s.includes('<') && s.includes('&lt;')) s = unescapeEntities(s)
  // ② <img> 注入无缝行内样式（保留 src 等已有属性；去掉固定宽高属性避免与自适应打架）
  s = s.replace(/<img\b([^>]*?)\/?>/gi, (_m, attrs: string) => {
    let a = String(attrs).replace(/\s(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    a = mergeStyle(a, IMG_SEAMLESS_STYLE)
    return `<img${a} />`
  })
  // ③ 纯图片段落 <p>（内部只有 img/br/空白/&nbsp;）注入去缝样式；含文字的 <p> 不动
  s = s.replace(
    /<p\b([^>]*)>((?:\s|&nbsp;|<br\s*\/?>)*(?:<img\b[^>]*\/?>(?:\s|&nbsp;|<br\s*\/?>)*)+)<\/p>/gi,
    (_m, attrs: string, inner: string) => `<p${mergeStyle(attrs, IMG_P_STYLE)}>${inner}</p>`,
  )
  return s
}

/* ============================================================================
 * 文章正文排版（对标微信公众号/今日头条阅读体验）—— 仅 normalizeArticleContent 使用。
 *
 * 🔴 兼容性设计：normalizeRichContent 的行为一个字节都没改。
 * 商品详情（shop-data.ts 的 normalizeRichDetail）依赖多图「无缝拼接」，圆角+外边距会
 * 破坏无缝效果，所以文章排版全部收敛在新导出函数 normalizeArticleContent 里，
 * 调用方不切换就完全不受影响。
 *
 * 同样受 rich-text 跨端约束：内部节点不吃页面 scoped CSS，只能行内样式注入。
 * ========================================================================== */

/** 文章段落：行高 1.85 + 段后距；不注入 font-size，字号继承页面 .ad-rich 的 34rpx 控制权 */
const ARTICLE_P_STYLE = 'margin:0 0 1.1em;line-height:1.85;'
/** 文章一二级标题 */
const ARTICLE_H12_STYLE = 'font-size:40rpx;font-weight:700;margin:1.5em 0 0.7em;line-height:1.4;'
/** 文章三级标题 */
const ARTICLE_H3_STYLE = 'font-size:36rpx;font-weight:600;margin:1.2em 0 0.6em;'
/** 文章引用块：朱红左线 + 米色底 + 右侧圆角 */
const ARTICLE_QUOTE_STYLE =
  'border-left:6rpx solid #c41e3a;background:#faf6f1;padding:20rpx 28rpx;margin:24rpx 0;color:#6e6e73;border-radius:0 12rpx 12rpx 0;'
/** 文章链接：朱红主题色 */
const ARTICLE_A_STYLE = 'color:#c41e3a;'
/** 文章列表：还原缩进与段后距（rich-text 里 ul/ol 默认样式在部分端会丢） */
const ARTICLE_LIST_STYLE = 'padding-left:1.4em;margin:0 0 1.1em;'
/** 文章配图：在 IMG_SEAMLESS_STYLE 之后追加（后声明覆盖其 margin:0）→ 圆角 + 上下留白 */
const ARTICLE_IMG_STYLE = 'border-radius:12rpx;margin:24rpx 0;'

/** HTML 特殊字符转义（纯文本包 <p> 前防注入；顺序：& 必须最先） */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * 纯文本 → HTML 段落：C 端手机编辑器产出纯文本，\n 在 rich-text 里按 HTML 规则
 * 折叠成空格 → 整篇糊成一段。按换行（\n\n 或单 \n）切段、逐段转义后包 <p>，空段丢弃。
 * 这里只包裸 <p>，段落样式交给 normalizeArticleContent 的统一排版注入。
 */
function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((seg) => seg.trim())
    .filter((seg) => seg.length > 0)
    .map((seg) => `<p>${escapeHtml(seg)}</p>`)
    .join('')
}

/**
 * 文章正文归一化 = normalizeRichContent（反转义 + 图片无缝基建）+ 排版行内注入 + 纯文本归一。
 * 页面零改动即生效（全部行内样式）。仅文章场景使用；商品/课程详情继续用 normalizeRichContent。
 */
export function normalizeArticleContent(html?: string): string {
  let s = String(html ?? '')
  if (!s.trim()) return ''
  // ① 双源归一：不含 '<' 时——若有 &lt; 实体是被转义的存量 HTML（交给 normalizeRichContent
  //    反转义）；否则视为手机编辑器产出的纯文本，切段包 <p>
  if (!s.includes('<') && !s.includes('&lt;')) s = plainTextToHtml(s)
  // ② 底层归一：反转义 + img 无缝通栏 + 纯图片段落去缝
  s = normalizeRichContent(s)
  // ③ 排版注入（沿用 mergeStyle：追加在原 style 之后，后声明覆盖）
  // h1/h2
  s = s.replace(
    /<h([12])\b([^>]*)>/gi,
    (_m, lvl: string, attrs: string) => `<h${lvl}${mergeStyle(attrs, ARTICLE_H12_STYLE)}>`,
  )
  // h3
  s = s.replace(/<h3\b([^>]*)>/gi, (_m, attrs: string) => `<h3${mergeStyle(attrs, ARTICLE_H3_STYLE)}>`)
  // blockquote
  s = s.replace(
    /<blockquote\b([^>]*)>/gi,
    (_m, attrs: string) => `<blockquote${mergeStyle(attrs, ARTICLE_QUOTE_STYLE)}>`,
  )
  // a
  s = s.replace(/<a\b([^>]*)>/gi, (_m, attrs: string) => `<a${mergeStyle(attrs, ARTICLE_A_STYLE)}>`)
  // ul / ol
  s = s.replace(
    /<(ul|ol)\b([^>]*)>/gi,
    (_m, tag: string, attrs: string) => `<${tag}${mergeStyle(attrs, ARTICLE_LIST_STYLE)}>`,
  )
  // p：跳过已被 normalizeRichContent 标记的「纯图片段落」（其 style 含 IMG_P_STYLE，
  //    再追加段落样式会覆盖掉 margin:0/line-height:0 破坏图片段落）
  s = s.replace(/<p\b([^>]*)>/gi, (m, attrs: string) =>
    attrs.includes(IMG_P_STYLE) ? m : `<p${mergeStyle(attrs, ARTICLE_P_STYLE)}>`,
  )
  // img：在无缝样式之后追加圆角 + 上下留白（后声明覆盖 margin:0）
  s = s.replace(
    /<img\b([^>]*?)\/?>/gi,
    (_m, attrs: string) => `<img${mergeStyle(attrs, ARTICLE_IMG_STYLE)} />`,
  )
  return s
}

/* ============================================================================
 * 文章编辑器「占位标记式插图」组装/反解（editor.vue 文章模式专用）。
 *
 * 编辑侧是纯 textarea（uni-app 无跨端富文本编辑器），采用微博长文同款方案：
 * 正文里用 [图N] 占位标记表示第 N 张配图的位置，发布时 composeArticleHtml
 * 把「纯文本 + 图片 URL 列表」组装成规范 HTML；草稿续编时 decomposeArticleHtml
 * 反解回「文本 + 图列表」回填 textarea。
 *
 * 🔴 组装端不注入任何行内样式——排版（h2 字号/img 圆角通栏/p 行高）由渲染端
 * normalizeArticleContent 统一行内注入，避免双重注入互相覆盖。
 * ========================================================================== */

/** 把 URL 转成可安全放进双引号属性的形态（escapeHtml 不管引号，属性位须补） */
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
}

/**
 * 纯文本 + 图列表 → 文章 HTML。规则：
 * - 按 \n 分段，空段丢弃；
 * - `## 标题` 行 → <h2>、`### 标题` 行 → <h3>（行首匹配，### 先于 ## 判）；
 * - `[图N]` → <img src="images[N-1]">；独立成段或段内混排均可（混排时拆成 图/文 各自成块）；
 * - 其余文字段 escapeHtml 后包裸 <p>；
 * - 未被正文引用的图片按序追加文末（保证传了的图都能发出去）；
 * - 指向不存在图片的标记（如手打 [图99]）静默丢弃。
 */
export function composeArticleHtml(text: string, images: string[]): string {
  const used = new Set<number>()
  const out: string[] = []
  const pushImg = (n: number) => {
    const src = images[n - 1]
    if (!src) return
    used.add(n - 1)
    out.push(`<img src="${escapeAttr(src)}" />`)
  }
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  for (const raw of lines) {
    const seg = raw.trim()
    if (!seg) continue
    const h3 = seg.match(/^###\s+(.+)$/)
    if (h3) { out.push(`<h3>${escapeHtml(h3[1].trim())}</h3>`); continue }
    const h2 = seg.match(/^##\s+(.+)$/)
    if (h2) { out.push(`<h2>${escapeHtml(h2[1].trim())}</h2>`); continue }
    // 段内可能混排 [图N]：按标记切开，图与文字各自独立成块
    for (const part of seg.split(/(\[图\d+\])/)) {
      const m = part.match(/^\[图(\d+)\]$/)
      if (m) { pushImg(parseInt(m[1], 10)); continue }
      const t = part.trim()
      if (t) out.push(`<p>${escapeHtml(t)}</p>`)
    }
  }
  // 未引用的图兜底追加文末
  images.forEach((src, i) => {
    if (src && !used.has(i)) out.push(`<img src="${escapeAttr(src)}" />`)
  })
  return out.join('')
}

/**
 * 文章 HTML → { text, images } 尽力反解（草稿续编回填 textarea 用）。
 * - <img src> → 独立行 [图N]，src 依序收进 images；
 * - <h1>/<h2> → `## ` 行、<h3> → `### ` 行；
 * - 其余块级标签闭合处、<br> → 换行；剩余标签剥掉只留文字；实体反转义。
 * 局限（如实声明）：粗体/斜体/链接/列表符号等富文本语义会丢（剥标签留文字）；
 * 非本编辑器产出的复杂 HTML（嵌套表格等）只能得到线性化文本。
 * 纯文本输入（旧草稿）原样返回，不做任何转换。
 */
export function decomposeArticleHtml(html?: string): { text: string; images: string[] } {
  let s = String(html ?? '')
  if (!s.trim()) return { text: '', images: [] }
  // 存量转义脏数据先反转义出真实标签
  if (!s.includes('<') && s.includes('&lt;')) s = unescapeEntities(s)
  // 纯文本（本功能上线前的旧草稿）原样返回
  if (!s.includes('<')) return { text: s, images: [] }
  const images: string[] = []
  // ① img → [图N] 占位（独立行）；src 若被转义过先还原
  s = s.replace(/<img\b[^>]*?src\s*=\s*(["'])([\s\S]*?)\1[^>]*?\/?>/gi, (_m, _q: string, src: string) => {
    const url = unescapeEntities(String(src)).trim()
    if (!url) return '\n'
    images.push(url)
    return `\n[图${images.length}]\n`
  })
  s = s.replace(/<img\b[^>]*\/?>/gi, '') // 无 src 的残缺 img 直接剥掉
  // ② 标题还原为 ##/### 行（h1 归并到 ##，与 compose 的 h2 同级展示）
  s = s.replace(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi, (_m, inner: string) => `\n## ${inner.replace(/<[^>]+>/g, '').trim()}\n`)
  s = s.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_m, inner: string) => `\n### ${inner.replace(/<[^>]+>/g, '').trim()}\n`)
  // ③ 块级边界与换行标签 → \n；其余标签剥掉留文字
  s = s.replace(/<\/(p|div|section|blockquote|li|h[1-6])>/gi, '\n')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  // ④ 实体反转义 + 空白收敛（连续空行压成一个空行）
  s = unescapeEntities(s).replace(/&nbsp;/g, ' ')
  const text = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return { text, images }
}
