import type { Request, Response } from "express"

/**
 * 媒体标签/InnerAudioContext 会通过 Range 请求探测和续取音频。
 * 返回标准 206，避免 iOS、微信 WebView 等环境把完整 200 响应判为不可播放。
 */
export function sendAudioWithRange(req: Request, res: Response, audio: Buffer, contentType: string, cacheControl: string) {
  const total = audio.length
  const commonHeaders = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
  }
  const range = req.headers.range
  if (!range) {
    res.set({ ...commonHeaders, "Content-Length": total.toString() })
    res.send(audio)
    return
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range)
  if (!match) {
    res.status(416)
    res.set({ ...commonHeaders, "Content-Range": `bytes */${total}` })
    res.end()
    return
  }

  const start = match[1] ? Number(match[1]) : 0
  const requestedEnd = match[2] ? Number(match[2]) : total - 1
  const end = Math.min(requestedEnd, total - 1)
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= total || end < start) {
    res.status(416)
    res.set({ ...commonHeaders, "Content-Range": `bytes */${total}` })
    res.end()
    return
  }

  const chunk = audio.subarray(start, end + 1)
  res.status(206)
  res.set({
    ...commonHeaders,
    "Content-Length": chunk.length.toString(),
    "Content-Range": `bytes ${start}-${end}/${total}`,
  })
  res.send(chunk)
}
