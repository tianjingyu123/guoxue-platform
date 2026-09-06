import { Injectable } from "@nestjs/common";
import { tc3Sign } from "../../common/tc3.util";
import { resolveTencentCloudCredentials } from "../../common/tencent-instance-role-credentials";

export interface CssStopTarget { roomId: string; domain: string; appName: string; resumeAtMs: number; exactScopeEnabled: boolean }
const uuid = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const requestId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{1,128}$/.test(v);
const domain = (v: unknown): v is string => typeof v === "string" && v.length <= 253
  && v.split(".").length >= 2 && v.split(".").every(label => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));

/** 内部供应商适配器。外层须先提交唯一停流意图；UNKNOWN 不准重发或释放额度。 */
@Injectable()
export class LiveCssStopClient {
  private payload(target: CssStopTarget) {
    if (!target || !uuid(target.roomId) || !domain(target.domain) || !/^[A-Za-z0-9_-]{1,64}$/.test(target.appName)) {
      throw new Error("CSS_STOP_TARGET_INVALID");
    }
    return { DomainName: target.domain, AppName: target.appName, StreamName: `room_${target.roomId}` };
  }

  /** 一次调用只发送一个禁推请求；成功仅是 ACK，不等于媒体与额度已收尾。 */
  async forbidOnce(target: CssStopTarget) {
    const payload = this.payload(target), now = Date.now();
    // 官方默认仅按流名匹配；精确三元组需腾讯云开通。不能静默假定已开通。
    if (target.exactScopeEnabled !== true) throw new Error("CSS_EXACT_SCOPE_NOT_VERIFIED");
    if (!Number.isSafeInteger(target.resumeAtMs) || target.resumeAtMs <= now || target.resumeAtMs > now + 90 * 86400000) {
      throw new Error("CSS_STOP_RESUME_TIME_INVALID");
    }
    const response = await this.call("ForbidLiveStream", { ...payload,
      ResumeTime: new Date(target.resumeAtMs).toISOString().replace(/\.\d{3}Z$/, "Z"), Reason: "平台已结束本次直播会话" });
    if (!response) return { state: "UNKNOWN" as const };
    return { state: "ACKNOWLEDGED" as const, requestId: response.RequestId as string, receivedAtMs: Date.now() };
  }

  /** 只读复核也可能 UNKNOWN；inactive 不是禁止重连证明。 */
  async queryState(target: CssStopTarget) {
    const response = await this.call("DescribeLiveStreamState", this.payload(target));
    if (!response || !["active", "inactive", "forbid"].includes(String(response.StreamState))) return { state: "UNKNOWN" as const };
    return { state: response.StreamState as "active" | "inactive" | "forbid", requestId: response.RequestId as string, receivedAtMs: Date.now() };
  }

  private async call(action: "ForbidLiveStream" | "DescribeLiveStreamState", payload: Record<string, unknown>) {
    try {
      const credentials = await resolveTencentCloudCredentials(process.env.TENCENT_SECRET_ID || "", process.env.TENCENT_SECRET_KEY || "");
      const signed = tc3Sign({ secretId: credentials.secretId, secretKey: credentials.secretKey, securityToken: credentials.securityToken,
        service: "live", action, version: "2018-08-01", payload });
      const response = await fetch(`https://${signed.host}`, { method: "POST", headers: signed.headers, body: signed.payloadStr,
        redirect: "error", signal: AbortSignal.timeout(10000) });
      if (!response.ok) return null;
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("Response" in data)) return null;
      const result = data.Response;
      if (!result || typeof result !== "object" || Array.isArray(result) || "Error" in result
        || !("RequestId" in result) || !requestId(result.RequestId)) return null;
      // 不返回供应商原包、错误消息、HTTP headers，避免秘密随错误链输出。
      return { RequestId: result.RequestId, StreamState: "StreamState" in result ? result.StreamState : undefined };
    } catch {
      // 请求可能已被供应商执行；网络/解析失败只记 UNKNOWN，禁止在此重试。
      return null;
    }
  }
}
