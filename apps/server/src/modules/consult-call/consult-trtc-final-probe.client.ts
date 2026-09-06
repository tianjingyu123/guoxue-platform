import { Injectable } from '@nestjs/common';
import { tc3Sign } from '../../common/tc3.util';
import { resolveTencentCloudCredentials } from '../../common/tencent-instance-role-credentials';

export type FinalProbeResult = { state: 'UNKNOWN' } | { state: 'ABSENT' | 'ACKNOWLEDGED'; requestId: string; receivedAt: string };
/** 是一次精确房间解散操作，不伪装成只读查询。成功受理不直接证明离线。 */
@Injectable()
export class ConsultTrtcFinalProbeClient {
  async dismissOnce(target: { sdkAppId: number; rtcRoomId: string; region: string }): Promise<FinalProbeResult> {
    if (!target || !Number.isSafeInteger(target.sdkAppId) || target.sdkAppId < 1 || target.sdkAppId > 0xffffffff
      || !/^consult_[a-f0-9]{16}$/.test(target.rtcRoomId) || !['ap-beijing', 'ap-guangzhou'].includes(target.region)) {
      throw new Error('CONSULT_FINAL_TARGET_INVALID');
    }
    const payload = { SdkAppId: target.sdkAppId, RoomId: target.rtcRoomId }, region = target.region;
    try {
      const credentials = await resolveTencentCloudCredentials(process.env.TENCENT_SECRET_ID || '', process.env.TENCENT_SECRET_KEY || '');
      const signed = tc3Sign({ ...credentials, service: 'trtc', action: 'DismissRoomByStrRoomId', version: '2019-07-22', region, payload });
      const response = await fetch('https://trtc.tencentcloudapi.com', { method: 'POST', headers: signed.headers, body: signed.payloadStr,
        redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (!response.ok) return { state: 'UNKNOWN' };
      const envelope: any = await response.json(), result = envelope?.Response;
      if (!result || typeof result !== 'object' || Array.isArray(result)
        || typeof result.RequestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(result.RequestId)) return { state: 'UNKNOWN' };
      const state = !('Error' in result) ? 'ACKNOWLEDGED' : result.Error?.Code === 'FailedOperation.RoomNotExist' ? 'ABSENT' : 'UNKNOWN';
      return state === 'UNKNOWN' ? { state } : { state, requestId: result.RequestId, receivedAt: new Date().toISOString() };
    } catch { return { state: 'UNKNOWN' }; }
  }
}
