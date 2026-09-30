/** 实际请求/录音/直播的租约，不以页面展示或模拟标志代替正在执行的业务。 */
export type CriticalActivity = "payment" | "live" | "recording" | "upload";
const leases = new Map<symbol, CriticalActivity>();
let listener: ((activities: CriticalActivity[]) => void) | undefined;
export function currentCriticalActivities(): CriticalActivity[] {
  return [...new Set(leases.values())];
}
function notify() {
  listener?.(currentCriticalActivities());
}
export function beginCriticalActivity(kind: CriticalActivity): () => void {
  const id = Symbol(kind);
  leases.set(id, kind);
  notify();
  return () => {
    leases.delete(id);
    notify();
  };
}
export function subscribeCriticalActivities(callback: (activities: CriticalActivity[]) => void) {
  listener = callback;
  notify();
}
let installed = false;
export function installCriticalActivityTracking(): void {
  if (installed) return;
  installed = true;
  for (const [method, kind] of [
    ["requestPayment", "payment"],
    ["uploadFile", "upload"],
  ] as const) {
    uni.addInterceptor(method, {
      invoke(options: Record<string, any>) {
        const release = beginCriticalActivity(kind);
        const complete = options.complete;
        options.complete = (...args: unknown[]) => {
          try {
            complete?.(...args);
          } finally {
            release();
          }
        };
      },
    });
  }
  // #ifdef APP-PLUS
  try {
    const recorder = uni.getRecorderManager();
    let release: (() => void) | undefined;
    recorder.onStart(() => {
      if (!release) release = beginCriticalActivity("recording");
    });
    recorder.onStop(() => {
      release?.();
      release = undefined;
    });
    recorder.onError(() => {
      release?.();
      release = undefined;
    });
  } catch {
    /* 没有录音模块的基座不制造录音能力 */
  }
  // #endif
}
