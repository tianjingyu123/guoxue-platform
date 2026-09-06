import { Injectable } from "@nestjs/common";
import { tc3Sign } from "../../common/tc3.util";
import { resolveTencentCloudCredentials } from "../../common/tencent-instance-role-credentials";

export interface ConsultTrtcStopTarget {
  sdkAppId: number;
  rtcRoomId: string;
  userIds: [string, string];
  region: "ap-beijing" | "ap-guangzhou";
}
export type ConsultTrtcStopResult = { state: "UNKNOWN" } | { state: "ACKNOWLEDGED"; requestId: string; receivedAt: string };

/** 仅移出本次咨询的两位参与者；成功响应不是禁止重连或额度释放证明。 */
@Injectable()
export class ConsultTrtcStopClient {
  async removeOnce(target: ConsultTrtcStopTarget): Promise<ConsultTrtcStopResult> {
    if (!target || !Number.isSafeInteger(target.sdkAppId) || target.sdkAppId < 1 || target.sdkAppId > 0xffffffff
      || !/^consult_[a-f0-9]{16}$/.test(target.rtcRoomId) || !["ap-beijing", "ap-guangzhou"].includes(target.region)
      || !Array.isArray(target.userIds) || target.userIds.length !== 2 || target.userIds[0] === target.userIds[1]
      || target.userIds.some(id => typeof id !== "string" || !/^c_[a-f0-9]{30}$/.test(id))) {
      throw new Error("CONSULT_TRTC_STOP_TARGET_INVALID");
    }
    // 在异步等待之前复制白名单字段，不允许传入对象在取得凭据期间改变目标。
    const payload = { SdkAppId: target.sdkAppId, RoomId: target.rtcRoomId, UserIds: [...target.userIds] };
    const region = target.region;
    try {
      const credentials = await resolveTencentCloudCredentials(process.env.TENCENT_SECRET_ID || "", process.env.TENCENT_SECRET_KEY || "");
      const signed = tc3Sign({ secretId: credentials.secretId, secretKey: credentials.secretKey, securityToken: credentials.securityToken,
        service: "trtc", action: "RemoveUserByStrRoomId", version: "2019-07-22", region, payload });
      const response = await fetch("https://trtc.tencentcloudapi.com", { method: "POST", headers: signed.headers, body: signed.payloadStr,
        redirect: "error", signal: AbortSignal.timeout(10000) });
      if (!response.ok) return { state: "UNKNOWN" };
      const envelope: unknown = await response.json();
      const result = envelope && typeof envelope === "object" && "Response" in envelope ? envelope.Response : null;
      if (!result || typeof result !== "object" || Array.isArray(result) || "Error" in result || !("RequestId" in result)
        || typeof result.RequestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(result.RequestId)) {
        return { state: "UNKNOWN" };
      }
      return { state: "ACKNOWLEDGED", requestId: result.RequestId, receivedAt: new Date().toISOString() };
    } catch {
      // 供应商可能已执行：禁止在这里重试或回传原始错误、响应和鉴权 headers。
      return { state: "UNKNOWN" };
    }
  }
}
