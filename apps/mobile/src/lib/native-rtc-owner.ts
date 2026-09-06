let owner: symbol | null = null

/** TRTC 原生插件是进程单例；直播与咨询不能相互销毁采集和监听。 */
export function claimNativeRtc(token: symbol) {
  if (owner && owner !== token) throw new Error('已有音视频连接，请先结束当前连接')
  owner = token
}
export function releaseNativeRtc(token: symbol) { if (owner === token) owner = null }
export function ownsNativeRtc(token: symbol) { return owner === token }
