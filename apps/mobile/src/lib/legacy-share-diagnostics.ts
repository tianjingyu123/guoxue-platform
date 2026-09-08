/** 仅供本地诊断：不返回地址原文、查询值、片段、用户信息或未知路径。 */
export function legacyShareDiagnosticShape(raw: string): string {
  try {
    // App 逻辑层不保证存在浏览器 URL 全局；诊断不依赖 DOM 或 URL 构造器。
    const match = raw.match(/^(https?):\/\/[^/?#]+([^?#]*)(?:\?([^#]*))?(#.*)?$/i)
    if (!match) return '{"invalid":true}'
    // 兼容原站带短版本后缀的静态脚本名；长数字、动态路径仍不输出。
    const path = /^(?:\/|\/(?:[a-zA-Z_]{1,24}\/){0,3}[a-zA-Z_]{1,48}[0-9]{0,2}\.php\/?)$/.test(match[2]) ? match[2] : '[非固定PHP路径]'
    const names = new Set<string>()
    for (const pair of (match[3] || '').split('&')) {
      if (pair && names.size < 24) names.add(pair.split('=', 1)[0])
    }
    const keys = Array.from(names).map(key => /^[a-zA-Z_]{1,40}$/.test(key) ? key : '[其他键]')
    const shape = match[2].replace(/[A-Za-z]+/g, 'a').replace(/\d+/g, 'n').replace(/[^an/._-]/g, '?').slice(0, 120)
    return JSON.stringify({ protocol: match[1].toLowerCase() + ':', path, pathShape: shape, keys, hashPresent: !!match[4] })
  } catch { return '{"invalid":true}' }
}
