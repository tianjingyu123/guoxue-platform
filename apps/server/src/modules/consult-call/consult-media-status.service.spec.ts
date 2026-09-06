import { ConsultMediaStatusService } from "./consult-media-status.service";
import { appendConsultMediaEvent, parseConsultMediaEvent, observeConsultMedia } from "./consult-media-evidence.policy";
import { createConsultStopIntent } from "./consult-call-stop-intent.policy";

describe("咨询媒体管理只读投影", () => {
  const id = "00000000-0000-4000-8000-00000000000a", caller = "00000000-0000-4000-8000-000000000002", expert = "00000000-0000-4000-8000-000000000003";
  const room = "consult_0123456789abcdef", now = Date.now(), scope = { sdkAppId: 1400000001, rtcRoomId: room };
  const evidence = appendConsultMediaEvent(null, parseConsultMediaEvent({ sdkAppId: scope.sdkAppId, receivedAt: now,
    bodyDigest: "a".repeat(64), body: { CallbackTs: now, EventType: 102, EventGroupId: 1, EventInfo: { RoomId: room, EventMsTs: now } } })!);
  const row = () => ({ id, status: "ENDED", circleId: "c1", callerId: caller, expertId: expert, rtcRoomId: room,
    boundaryId: id, scope, expiresAt: new Date(now + 600000), revision: 1, mediaEvidence: evidence,
    stopIntent: { ...createConsultStopIntent({ operationId: id, reason: "END", requestedBy: caller, now: new Date(now),
      boundary: { scope, expiresAt: new Date(now + 600000), revision: 1 } }), state: "ACKNOWLEDGED",
      dispatch: { region: "ap-beijing", claimedAt: new Date(now).toISOString(), leaseUntil: new Date(now + 60000).toISOString(),
        resultAt: new Date(now + 1).toISOString(), providerRequestId: id }, privateKey: "DO_NOT_EXPOSE" },
    quotaState: "ACTIVE", quotaCircleId: "c1", quotaActorId: caller, quotaSubjectId: expert });
  let query: jest.Mock, service: ConsultMediaStatusService;
  beforeEach(() => { query = jest.fn().mockResolvedValue([row()]); service = new ConsultMediaStatusService({ $queryRaw: query } as any); });
  afterEach(() => jest.useRealTimers());
  it("必须同时具备完成标记与同主体账本回执才显示已归还", async () => {
    const data: any = row(), evidenceRef = `consult-final:${'c'.repeat(64)}`;
    Object.assign(data, { type: 'VOICE', quotaState: 'COMPLETED', quotaId: 'q1', quotaRevision: 3,
      receiptAction: 'COMPLETE', receiptSource: 'BUSINESS_ADAPTER', receiptActorId: null, receiptEvidenceRef: evidenceRef,
      receiptQuotaId: 'q1', receiptRevision: 3, receiptSnapshot: { id: 'q1', revision: 3, binding: { circleId: 'c1', actorId: caller,
        subjectUserId: expert, capability: 'AUDIO_QUESTION', businessType: 'AUDIO_QUESTION', businessId: id, requestKey: id, units: 1 } } });
    data.stopIntent.completion = { quotaId: 'q1', quotaRevision: 3, evidenceRef };
    query.mockResolvedValue([data]);
    expect(await service.read(id)).toMatchObject({ completionVerified: true, closureChecks: [], canRelease: false });
    data.receiptSnapshot.binding.subjectUserId = caller;
    expect(await service.read(id)).toMatchObject({ completionVerified: false, canRelease: false });
  });
  it("保护期后不把此前的旧解散误认为最终整房证据", async () => {
    jest.useFakeTimers().setSystemTime(now + 1000000);
    const result = await service.read(id);
    expect(result).toMatchObject({ finalRoomObserved: false, canRelease: false });
    expect(result.closureChecks.map(check => check.code)).toEqual(["FINAL_ROOM_OBSERVATION_MISSING", "FINAL_PROOF_REQUIRED"]);
  });
  it("取得保护期后整房观察仍不越过权限与账本事务门禁", async () => {
    jest.useFakeTimers().setSystemTime(now + 1000000);
    const data = row();
    data.mediaEvidence = appendConsultMediaEvent(null, parseConsultMediaEvent({ sdkAppId: scope.sdkAppId,
      receivedAt: now + 1000000, bodyDigest: "b".repeat(64), body: { CallbackTs: now + 1000000,
        EventType: 102, EventGroupId: 1, EventInfo: { RoomId: room, EventMsTs: now + 950000 } } })!);
    query.mockResolvedValue([data]);
    const result = await service.read(id);
    expect(result).toMatchObject({ finalRoomObserved: true, quotaState: "ACTIVE", canRelease: false });
    expect(result.closureChecks.map(check => check.code)).toEqual(["FINAL_PROOF_REQUIRED"]);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("订单结束+ACK+退房仍保留ACTIVE，不提供释放入口，且只做一次参数化SELECT", async () => {
    const result = await service.read(id);
    expect(result).toMatchObject({ orderStatus: "ENDED", stopState: "ACKNOWLEDGED", mediaObservation: "OFFLINE_OBSERVED", quotaState: "ACTIVE", canRelease: false });
    expect(result.closureChecks.map(check => check.code)).toEqual(["REENTRY_WINDOW_OPEN", "FINAL_PROOF_REQUIRED"]);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toBe(id);
    expect(query.mock.calls[0][0].join("?")).toMatch(/^\s*SELECT /);
    expect(JSON.stringify(result)).not.toMatch(/DO_NOT_EXPOSE|sdkAppId|rtcRoomId|callerId|expertId|bodyDigest|privateKey/);
  });
  it.each(["dispatch", "protectUntil", "operationId", "requestedBy", "version"])("不完整或跨主体的 %s 待办不再显示受理成功", async key => {
    const data = row();
    delete (data.stopIntent as any)[key];
    query.mockResolvedValue([data]);
    const result = await service.read(id);
    expect(result.stopState).toBe("INVALID");
    expect(result.stopRequestedAt).toBeNull();
    expect(result.closureChecks.some(check => check.code === "STOP_UNVERIFIED")).toBe(true);
    expect(result.canRelease).toBe(false);
  });
  it("缺少历史边界不伪造状态", async () => {
    query.mockResolvedValue([{ ...row(), boundaryId: null, scope: null, stopIntent: null, mediaEvidence: null, quotaState: null }]);
    expect(await service.read(id)).toMatchObject({ boundaryStatus: "UNTRACKED", stopState: "NOT_REQUESTED", mediaObservation: "UNKNOWN", quotaState: "UNTRACKED" });
  });
  it.each(["scope", "revision", "party", "evidence"])("%s 异常不能展示可靠离线证据", async kind => {
    const bad = row();
    if (kind === "scope") bad.scope = { ...scope, sdkAppId: 2 };
    if (kind === "revision") bad.revision = 0;
    if (kind === "party") bad.expertId = caller;
    if (kind === "evidence") bad.mediaEvidence = { ...evidence, events: evidence.events.map(event => ({ ...event, key: "b".repeat(64) })) };
    query.mockResolvedValue([bad]);
    expect(await service.read(id)).toMatchObject({ mediaObservation: "UNKNOWN", evidenceRevision: null, canRelease: false });
  });
  it("其他主体的资源账本不能显示为本单已释放", async () => {
    query.mockResolvedValue([{ ...row(), quotaActorId: expert, quotaState: "RELEASED" }]);
    expect(await service.read(id)).toMatchObject({ quotaState: "UNKNOWN" });
  });
  it("非法ID在查询前拒绝", async () => { await expect(service.read("bad")).rejects.toThrow(); expect(query).not.toHaveBeenCalled(); });
  it("不存在与重复记录不能伪造成功", async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([row(), row()]);
    await expect(service.read(id)).rejects.toThrow("通话记录不存在");
    await expect(service.read(id)).rejects.toThrow("CONSULT_MEDIA_STATUS_NOT_UNIQUE");
  });
  it("只读观察器拒绝损坏JSON", () => {
    const parties: [string, string] = [`c_${"a".repeat(30)}`, `c_${"b".repeat(30)}`];
    for (const bad of [null, {}, { ...evidence, events: null }, { ...evidence, revision: 0 }, { ...evidence, events: [null] }]) {
      expect(observeConsultMedia(bad as any, parties)).toBe("UNKNOWN");
    }
  });
});
