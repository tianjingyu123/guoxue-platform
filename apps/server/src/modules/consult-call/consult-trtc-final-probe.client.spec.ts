import { ConsultTrtcFinalProbeClient } from './consult-trtc-final-probe.client';
import { resolveTencentCloudCredentials } from '../../common/tencent-instance-role-credentials';
import { validConsultFinalProbe } from './consult-trtc-final-probe.policy';
jest.mock('../../common/tencent-instance-role-credentials', () => ({ resolveTencentCloudCredentials: jest.fn() }));
describe('咨询最终房间核验适配器（不发送真实请求）', () => {
  const saved = global.fetch, client = new ConsultTrtcFinalProbeClient();
  const id = '00000000-0000-4000-8000-000000000001';
  const target = { sdkAppId: 1, rtcRoomId: 'consult_0123456789abcdef', region: 'ap-beijing' };
  beforeEach(() => {
    (resolveTencentCloudCredentials as jest.Mock).mockResolvedValue({ secretId: 'SYNTHETIC', secretKey: 'SYNTHETIC' });
    global.fetch = jest.fn();
  });
  afterEach(() => { global.fetch = saved; jest.clearAllMocks(); });
  it.each([['ABSENT', { RequestId: id, Error: { Code: 'FailedOperation.RoomNotExist', Message: 'DO_NOT_EXPOSE' } }],
    ['ACKNOWLEDGED', { RequestId: id }], ['UNKNOWN', { RequestId: id, Error: { Code: 'InternalError' } }],
    ['UNKNOWN', { Error: { Code: 'FailedOperation.RoomNotExist' } }], ['UNKNOWN', { RequestId: id, Error: null }]])('仅精确错误码和请求号可形成不存在证据：%s', async (state, body) => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ Response: body }) });
    const result = await client.dismissOnce(target); expect(result.state).toBe(state);
    expect(JSON.stringify(result)).not.toMatch(/SYNTHETIC|DO_NOT_EXPOSE/); expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://trtc.tencentcloudapi.com'); expect(options.headers['X-TC-Action']).toBe('DismissRoomByStrRoomId');
    expect(JSON.parse(options.body)).toEqual({ SdkAppId: 1, RoomId: target.rtcRoomId }); expect(options.redirect).toBe('error');
  });
  it('超时不重试', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('DO_NOT_EXPOSE'));
    expect(await client.dismissOnce(target)).toEqual({ state: 'UNKNOWN' }); expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([{ sdkAppId: 0 }, { rtcRoomId: 'public-room' }, { region: 'unknown' }])('非法目标零网络 %#', async change => {
    await expect(client.dismissOnce({ ...target, ...change })).rejects.toThrow(); expect(global.fetch).not.toHaveBeenCalled();
  });
  it('最终证明必须在保护期后认领，结果须在本次租约内', () => {
    const at = 1788650000000, iso = (n: number) => new Date(n).toISOString();
    const probe = { state: 'ABSENT', region: 'ap-beijing', claimedAt: iso(at), leaseUntil: iso(at + 60000), resultAt: iso(at + 1000), requestId: id };
    expect(validConsultFinalProbe(probe, iso(at - 1), at + 2000)).toBe(true);
    expect(validConsultFinalProbe(probe, iso(at), at + 2000)).toBe(false);
    expect(validConsultFinalProbe({ ...probe, resultAt: iso(at + 61000) }, iso(at - 1), at + 62000)).toBe(false);
    expect(validConsultFinalProbe({ ...probe, requestId: undefined }, iso(at - 1), at + 2000)).toBe(false);
  });
});
