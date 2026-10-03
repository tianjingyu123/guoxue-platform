import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { VoiceSessionService } from "./voice-session.service";

describe("语音预留失败后的同请求幂等边界", () => {
  function fixture(error: unknown, winner: unknown) {
    const prisma = { voiceSession: { findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValue(winner) } };
    const quota = { startSession: jest.fn().mockRejectedValue(error) };
    const provider = { id: "mock", isMock: true, probe: jest.fn().mockResolvedValue({ available: true }), issueSession: jest.fn() };
    const contexts = { resolve: jest.fn().mockResolvedValue({ tier: "lite", context: { version: "test" } }) };
    type Dependencies = ConstructorParameters<typeof VoiceSessionService>;
    const service = new VoiceSessionService(
      prisma as unknown as Dependencies[0], quota as unknown as Dependencies[1],
      contexts as unknown as Dependencies[2], provider as unknown as Dependencies[3], {} as Dependencies[4],
    );
    return { prisma, provider, start: () => service.start("synthetic-owner", { scene: "plaza", contextId: "xiaobu", clientRequestId: "same-request" }) };
  }

  it.each([
    ["CAS 冲突", new BusinessException(ErrorCode.CONFLICT)],
    ["赢家已耗尽额度", new BusinessException(ErrorCode.BAD_REQUEST)],
    ["唯一键冲突", { code: "P2002" }],
  ])("%s：复用本人同一请求，不再次签发", async (_name, error) => {
    const f = fixture(error, { id: "winner", userId: "synthetic-owner", status: "reserved" });
    expect(await f.start()).toMatchObject({ duplicated: true, session: { id: "winner" } });
    expect(f.prisma.voiceSession.findUnique.mock.calls[1][0]).toEqual(f.prisma.voiceSession.findUnique.mock.calls[0][0]);
    expect(f.provider.issueSession).not.toHaveBeenCalled();
  });

  it.each([null, { id: "foreign", userId: "other-owner" }])("没有本人同请求的赢家：原额度错误继续抛出", async (winner) => {
    const error = new BusinessException(ErrorCode.CONFLICT);
    const f = fixture(error, winner);
    await expect(f.start()).rejects.toBe(error);
    expect(f.provider.issueSession).not.toHaveBeenCalled();
  });

  it.each([new Error("事务失败"), new BusinessException(ErrorCode.FORBIDDEN)])("其他错误不查询赢家、不伪报成功", async (error) => {
    const f = fixture(error, { id: "winner", userId: "synthetic-owner" });
    await expect(f.start()).rejects.toBe(error);
    expect(f.prisma.voiceSession.findUnique).toHaveBeenCalledTimes(1);
    expect(f.provider.issueSession).not.toHaveBeenCalled();
  });
});
