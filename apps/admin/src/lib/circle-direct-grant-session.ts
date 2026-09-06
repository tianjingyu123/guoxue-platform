/** 定向授权交互会话：不发请求，不把预览等同于服务端授权。 */
export interface DirectGrantTarget {
  circleId: string;
  capability: 'LIVE' | 'SHORT_VIDEO' | 'AUDIO_QUESTION' | 'VIDEO_QUESTION';
  subjectUserId?: string;
}

export interface DirectGrantPreview {
  target: DirectGrantTarget;
  circleName: string;
  subjectName: string;
  latestId?: string;
  latestRevision: number;
}

export interface DirectGrantTerms {
  reason: string;
  expiresAt: string;
  maxUnits: number;
  maxConcurrent: number;
}

const sameTarget = (a: DirectGrantTarget, b: DirectGrantTarget) =>
  a.circleId === b.circleId && a.capability === b.capability &&
  (a.subjectUserId || '') === (b.subjectUserId || '');

/** 请求失败或结果不明时必须重新查询；不自动重发授权请求。 */
export function createDirectGrantSession(clock: () => number = Date.now) {
  let generation = 0;
  let target: DirectGrantTarget | undefined;
  let preview: DirectGrantPreview | undefined;
  let previewAt = 0;
  let pending: symbol | undefined;
  return {
    select(next: DirectGrantTarget) {
      if (pending) throw new Error('正在提交，请等待本次结果');
      target = { ...next };
      preview = undefined;
      return ++generation;
    },
    acceptPreview(ticket: number, value: DirectGrantPreview) {
      if (pending || ticket !== generation || !target || !sameTarget(target, value.target)) return false;
      if (!Number.isInteger(value.latestRevision) || value.latestRevision < 0 ||
          value.latestRevision > 2147483646 || Boolean(value.latestId) !== (value.latestRevision > 0) ||
          !value.circleName.trim() || !value.subjectName.trim()) return false;
      preview = { ...value, target: { ...value.target } };
      previewAt = clock();
      return true;
    },
    begin(terms: DirectGrantTerms) {
      if (pending) throw new Error('本次授权已提交，请勿重复提交');
      const age = clock() - previewAt;
      if (!preview || age < 0 || age > 60000) throw new Error('对象信息已失效，请重新查询');
      if (!terms.reason.trim() || terms.reason.length > 500) throw new Error('请填写不超过500字的授权理由');
      const expires = Date.parse(terms.expiresAt);
      if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(terms.expiresAt) || !Number.isFinite(expires) ||
          expires <= clock() || expires - clock() > 3650 * 86400000) throw new Error('请填写有效的有限授权期限');
      for (const limit of [terms.maxUnits, terms.maxConcurrent]) {
        if (!Number.isInteger(limit) || limit < 1 || limit > 2147483647) throw new Error('额度必须为正整数');
      }
      if (terms.maxConcurrent > terms.maxUnits) throw new Error('最大并发不能超过总额度');
      const token = Symbol('单次授权');
      pending = token;
      const { circleId, capability, subjectUserId } = preview.target;
      return {
        token,
        circleId,
        body: { capability, ...(subjectUserId ? { subjectUserId } : {}),
          ...(preview.latestId ? { expectedLatestId: preview.latestId } : {}),
          expectedLatestRevision: preview.latestRevision,
          reason: terms.reason.trim(), expiresAt: terms.expiresAt,
          maxUnits: terms.maxUnits, maxConcurrent: terms.maxConcurrent },
      };
    },
    settle(token: symbol) {
      if (pending !== token) return false;
      pending = undefined;
      preview = undefined;
      ++generation;
      return true;
    },
  };
}
