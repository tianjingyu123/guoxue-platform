import { apiPost } from '@/utils/request'

export interface BaziReversePillars {
  year: string
  month: string
  day: string
  hour: string
  ziShiMode: 'traditional' | 'modern'
}

export interface BaziReverseCandidate {
  year: number
  month: number
  day: number
  hours: { hour: number; minutes: number[] }[]
}

export interface BaziReverseResult {
  fromYear: number
  toYear: number
  candidates: BaziReverseCandidate[]
}

export const baziReverseApi = {
  lookup: (pillars: BaziReversePillars) => apiPost<BaziReverseResult>('/paipan/bazi/reverse', pillars),
}
