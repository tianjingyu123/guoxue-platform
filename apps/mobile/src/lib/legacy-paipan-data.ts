import { apiGet } from '@/utils/request'

export interface LegacyPaipanEntry {
  mode: 'legacy' | 'native'
  url: string | null
  attributionReady: boolean
}

export const legacyPaipanApi = {
  entry: () => apiGet<LegacyPaipanEntry>('/legacy-paipan/entry'),
}
