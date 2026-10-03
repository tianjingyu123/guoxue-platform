/** 固定客户通道按实际解码后字节计量；超限、断流或取消均不返回部分JSON。 */
export async function readBoundedJson(response: Response, maxBytes: number, signal: AbortSignal): Promise<{ bytes: Buffer; value: unknown }> {
  const failure = () => new Error("客户模型响应未完整读取或超过技术上限");
  const discard = () => { if (response.body && !response.body.locked) void response.body.cancel().catch(() => {}); };
  const length = response.headers.get("content-length");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || !response.body || signal.aborted || (length !== null && (!/^[0-9]+$/.test(length) || Number(length) > maxBytes))) {
    discard(); throw failure();
  }
  // 固定缓冲避免极小分块造成大量数组项及Buffer对象。
  const reader = response.body.getReader(), storage = Buffer.allocUnsafe(maxBytes);
  let size = 0, rejectAbort: () => void;
  const aborted = new Promise<never>((_resolve, reject) => { rejectAbort = () => reject(failure()); });
  signal.addEventListener("abort", rejectAbort!, { once: true });
  try {
    if (signal.aborted) throw failure();
    for (;;) {
      const result = await Promise.race([reader.read(), aborted]);
      if (signal.aborted) throw failure();
      if (result.done) break;
      if (!(result.value instanceof Uint8Array)) throw failure();
      if (result.value.byteLength > maxBytes - size) throw failure();
      storage.set(result.value, size); size += result.value.byteLength;
    }
    const bytes = storage.subarray(0, size), value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw failure();
    return { bytes, value };
  } catch {
    // 取消上游读取，不等待不受控的底层取消回调；调用方同时中止实际fetch。
    void reader.cancel().catch(() => {}); throw failure();
  } finally {
    signal.removeEventListener("abort", rejectAbort!); reader.releaseLock();
  }
}
