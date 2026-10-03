/** App-Plus 的部分 Android WebView 未提供 URLSearchParams，启动时补齐项目实际使用的最小能力。 */
class CompatibleURLSearchParams {
  private values: Record<string, string> = {}

  constructor(init: string | Record<string, unknown> = '') {
    if (typeof init === 'string') {
      const query = init.replace(/^\?/, '')
      for (const item of query.split('&')) {
        if (!item) continue
        const [rawKey, ...rawValue] = item.split('=')
        this.values[this.decode(rawKey)] = this.decode(rawValue.join('='))
      }
    } else {
      for (const key in init) this.set(key, String(init[key]))
    }
  }

  private decode(value: string): string {
    try { return decodeURIComponent(value.replace(/\+/g, ' ')) } catch { return value }
  }

  get(name: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.values, name) ? this.values[name] : null
  }

  has(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.values, name)
  }

  set(name: string, value: string): void {
    this.values[String(name)] = String(value)
  }

  toString(): string {
    return Object.keys(this.values)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(this.values[key])}`)
      .join('&')
  }
}

if (typeof globalThis.URLSearchParams === 'undefined') {
  Object.defineProperty(globalThis, 'URLSearchParams', { configurable: true, writable: true, value: CompatibleURLSearchParams })
}

export {}
