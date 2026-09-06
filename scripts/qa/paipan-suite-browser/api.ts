import { reactive } from 'vue'
export const state = reactive({ mode: 'legacy', enabled: false, writes: 0, revision: 'a'.repeat(64), conflictNext: false })
const snapshot = () => ({ mode: state.mode, enabled: state.enabled, revision: state.revision })
export const api = {
  async get(url: string) {
    if (url !== '/system/native-paipan-preview') throw new Error('LOCAL_ONLY')
    return { data: snapshot() }
  },
  async put(url: string, body: { mode: string; enabled: boolean; expectedRevision: string }) {
    if (url !== '/system/native-paipan-preview') throw new Error('LOCAL_ONLY')
    if (state.conflictNext) { state.conflictNext = false; throw new Error('LOCAL_409') }
    if (body.expectedRevision !== state.revision) throw new Error('LOCAL_409')
    if (!['native', 'legacy'].includes(body.mode) || typeof body.enabled !== 'boolean') throw new Error('LOCAL_400')
    state.mode = body.mode; state.enabled = body.enabled; state.writes++
    state.revision = String(state.writes).padStart(64, '0')
    return { data: snapshot() }
  },
}
