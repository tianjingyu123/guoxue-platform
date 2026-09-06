export interface ConsultFinalProbe {
  state: 'DISPATCHING' | 'ACKNOWLEDGED' | 'ABSENT' | 'UNKNOWN';
  claimedAt: string; leaseUntil: string; region: string; resultAt?: string; requestId?: string;
}
export function validConsultFinalProbe(value: unknown, protectUntil: string, now: number): value is ConsultFinalProbe {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as ConsultFinalProbe;
  const time = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(Date.parse(v)).toISOString() === v ? Date.parse(v) : NaN;
  const at = time(p.claimedAt), until = time(p.leaseUntil), result = time(p.resultAt), protect = time(protectUntil);
  if (!Number.isSafeInteger(now) || !Number.isFinite(protect) || !Number.isFinite(at) || at <= protect || at > now
    || until !== at + 60000 || !['ap-beijing', 'ap-guangzhou'].includes(p.region)) return false;
  if (p.state === 'DISPATCHING') return p.resultAt === undefined && p.requestId === undefined;
  if (!Number.isFinite(result) || result < at || result > now) return false;
  if (p.state === 'UNKNOWN') return p.requestId === undefined;
  return ['ACKNOWLEDGED', 'ABSENT'].includes(p.state) && result <= until && typeof p.requestId === 'string'
    && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(p.requestId);
}
