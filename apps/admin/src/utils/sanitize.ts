import DOMPurify from 'dompurify'

/** 对 HTML 内容做 XSS 消毒，允许基本格式化标签 */
export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'blockquote', 'pre', 'code', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel', 'width', 'height'],
  })
}
