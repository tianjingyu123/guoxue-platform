// #ifdef APP-PLUS
import { includeResourceHook } from "@/uni_modules/rebu-resource-updater";
// #endif
import type {
  NativeResourceBridge,
  NativeResourceIdentity,
  ResourceJournal,
} from "./resource-updater";
import type { ResourceManifest, SignedWgtControl } from "@guoxue/shared";
type NativeReply<T> = { ok: boolean; value: T; message?: string };
export class AndroidResourceBridge implements NativeResourceBridge {
  private runtime: any;
  constructor() {
    // #ifdef APP-PLUS
    includeResourceHook();
    this.runtime = plus.android.importClass("cn.rebu.resource.ResourceRuntime");
    // #endif
    if (!this.runtime) throw new Error("当前完整包没有原生资源扩展");
  }
  call<T>(action: string, args: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const callback = plus.android.implements("cn.rebu.resource.ResourceRuntime$Callback", {
        onResult: (json: string) => {
          try {
            const result = JSON.parse(json) as NativeReply<T>;
            if (result.ok) resolve(result.value);
            else reject(new Error(result.message || "原生资源操作失败"));
          } catch (error) {
            reject(error);
          }
        },
      });
      try {
        this.runtime.dispatch(action, JSON.stringify(args), callback);
      } catch (error) {
        reject(error);
      }
    });
  }
  bindRuntime(): Promise<boolean> {
    return this.call("bindRuntime", { path: plus.io.convertLocalFileSystemURL("_www/") });
  }
  replaceTrust(keys: SignedWgtControl[]): Promise<boolean> {
    return this.call("replaceTrust", { keys });
  }
  identity(): Promise<NativeResourceIdentity> {
    return this.call("identity");
  }
  recoveryContract(): Promise<{
    beforeJavascript: boolean;
    atomicSwitch: boolean;
    verifiedBuild: string;
  }> {
    return this.call("recoveryContract");
  }
  verifySignature(canonical: string, signature: string, keyId: string): Promise<boolean> {
    return this.call("verifySignature", { canonical, signature, keyId });
  }
  downloadToTemporary(url: string, expectedBytes: number, releaseId: string): Promise<string> {
    return this.call("download", { url, bytes: expectedBytes, releaseId });
  }
  verifyFile(path: string, sha256: string, bytes: number): Promise<boolean> {
    return this.call("verifyFile", { path, sha256, bytes });
  }
  stageAtomically(path: string, _manifest: ResourceManifest): Promise<string> {
    return this.call("stage", { path });
  }
  discardTemporary(path: string): Promise<void> {
    return this.call("discard", { path });
  }
  readJournal(): Promise<ResourceJournal | null> {
    return this.call("journal");
  }
  async writeJournal(_journal: ResourceJournal): Promise<void> {
    if (!(await this.call("journalWritten"))) throw new Error("原生暂存日志尚未持久化");
  }
  async activateAtomically(_journal: ResourceJournal): Promise<void> {
    throw new Error("当前 JS 会话不能切换资源；由下次原生启动钩子执行");
  }
  async queueForNextColdLaunch(_journal: ResourceJournal): Promise<void> {
    if (!(await this.call("activate"))) throw new Error("关键业务期间不允许排队切换");
  }
  confirmHealthy(releaseId: string): Promise<void> {
    return this.call("healthy", { releaseId });
  }
  criticalActivities(): ReturnType<NativeResourceBridge["criticalActivities"]> {
    return this.call("critical");
  }
}
