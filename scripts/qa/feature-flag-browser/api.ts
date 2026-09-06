import { reactive } from 'vue'
export const state = reactive({ writes: 0, conflictNext: false, notices: [] as string[] })
let row = { key: 'client_qa_demo', name: '合成演示入口', description: '仅本机合成数据，不连接预发布', enabled: false, percentage: 20, targetUserIds: [] as string[], updatedAt: new Date().toISOString() }
let revision = 1
let deleted = false
const history = [{ id: '1', version: 1, value: { ...row }, changedBy: '本地验收', createdAt: row.updatedAt }]
const fingerprint = () => revision.toString(16).padStart(64, '0')
const copy = (value: unknown) => JSON.parse(JSON.stringify(value))
export const api = {
  async get(url: string) { return { data: copy(url.endsWith('/history') ? [...history].reverse()
    : url.endsWith('/archived/list') ? (deleted ? [{ key: row.key, name: row.name }] : []) : deleted ? [] : [row]) } },
  async post(url: string, body: Record<string, any> = {}) {
    if (url.endsWith('/preview')) {
      const next = { ...row, ...body }
      return { data: { previewOnly: true, published: false, baseFingerprint: fingerprint(), enabled: next.enabled,
        percentage: next.percentage, targetUserCount: next.targetUserIds.length, anonymousEnabled: next.enabled && next.percentage === 100, clientVisible: true } }
    }
    if (state.conflictNext) { state.conflictNext = false; revision++; state.notices.push('模拟另一管理员修改'); throw new Error('409') }
    if (body.expectedFingerprint !== fingerprint()) throw new Error('409')
    if (url.includes('/rollback/')) {
      const target = history.find(item => item.version === Number(url.split('/').pop()))
      if (!target) throw new Error('404')
      row = copy(target.value)
      deleted = false
    } else {
      const { expectedFingerprint: _fingerprint, ...fields } = body
      row = { ...row, ...fields }
    }
    revision++; state.writes++; row.updatedAt = new Date().toISOString()
    history.push({ id: String(revision), version: revision, value: copy(row), changedBy: '本地验收', createdAt: row.updatedAt })
    return { data: copy(row) }
  },
  async put(url: string, body: Record<string, any>) { return this.post(url, body) },
  async delete(_url: string, options: { data: { expectedFingerprint: string } }) {
    if (options.data.expectedFingerprint !== fingerprint()) throw new Error('409')
    deleted = true; revision++; state.writes++
    return { data: { success: true } }
  },
}
