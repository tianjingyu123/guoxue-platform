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
